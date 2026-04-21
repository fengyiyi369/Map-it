/**
 * Map It — with Supabase Auth + Cloud Sync
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  Folder as FolderIcon,
  ExternalLink,
  Plus,
  LayoutGrid,
  List,
  ArrowLeft,
  Cat,
  Dog,
  Flower2,
  Coins,
  ChevronRight,
  Edit2,
  Trash2,
  Check,
  X,
  LogOut,
  Loader2,
  Save,
} from 'lucide-react';
import { AppScreen, Folder, Note, ViewMode } from './types';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// ─── Auth Screen ─────────────────────────────────────────────────────────────

function AuthPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccessMsg('');
    if (!email || !password) { setError('请填写邮箱和密码'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw e;
        if (data.user && !data.session) {
          setSuccessMsg('注册成功！请查收邮件完成验证后登录。');
        } else if (data.user) {
          onAuth(data.user);
        }
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        if (data.user) onAuth(data.user);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '操作失败，请重试';
      if (msg.includes('Invalid login')) setError('邮箱或密码错误');
      else if (msg.includes('already registered')) setError('该邮箱已注册，请直接登录');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen paper-texture flex items-center justify-center px-6"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-bold mb-3">Map It</h1>
          <p className="text-[#666] text-lg">Stop Scattering. Start Mapping.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/5 p-8 shadow-sm">
          {/* Tab */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === m ? 'bg-white shadow-sm text-black' : 'text-gray-400'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="your@email.com"
                className="mt-1.5 w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={mode === 'signup' ? '至少6位' : '••••••••'}
                className="mt-1.5 w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm">
              {successMsg}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full py-3.5 bg-[#141414] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/80 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {mode === 'login' ? '登录' : '创建账号'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load folders when user logs in
  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoadingData(false); return; }
        if (data && data.length > 0) {
          setFolders(data.map(row => ({
            id: row.id,
            name: row.name,
            notes: row.notes ?? [],
            isExpanded: false,
          })));
        }
        setLoadingData(false);
      });
  }, [user]);

  const persistFolders = useCallback(async (updated: Folder[]) => {
    if (!user) return;
    setSaving(true);
    // Upsert all folders
    const rows = updated.map(f => ({
      id: f.id,
      user_id: user.id,
      name: f.name,
      notes: f.notes,
    }));
    await supabase.from('folders').upsert(rows, { onConflict: 'id' });
    // Delete removed folders
    const currentIds = updated.map(f => f.id);
    await supabase.from('folders').delete().eq('user_id', user.id).not('id', 'in', `(${currentIds.join(',')})`);
    setSaving(false);
  }, [user]);

  const updateFolders = (updated: Folder[]) => {
    setFolders(updated);
    persistFolders(updated);
  };

  const toggleFolder = (id: string) =>
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f));

  const openNote = (note: Note) => { setSelectedNote(note); setScreen('detail'); };

  const addFolder = () => {
    const newFolder: Folder = { id: Date.now().toString(), name: '新文件夹', notes: [], isExpanded: false };
    updateFolders([...folders, newFolder]);
  };

  const deleteFolder = (id: string) => updateFolders(folders.filter(f => f.id !== id));

  const renameFolder = (id: string, name: string) =>
    updateFolders(folders.map(f => f.id === id ? { ...f, name } : f));

  const addNote = (folderId: string, note: Note) =>
    updateFolders(folders.map(f => f.id === folderId ? { ...f, notes: [...f.notes, note] } : f));

  const deleteNote = (folderId: string, noteId: string) =>
    updateFolders(folders.map(f => f.id === folderId ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f));

  const toggleRead = (folderId: string, noteId: string) =>
    updateFolders(folders.map(f => f.id === folderId
      ? { ...f, notes: f.notes.map(n => n.id === noteId ? { ...n, isRead: !n.isRead } : n) }
      : f
    ));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setFolders([]);
    setScreen('splash');
  };

  // Not yet checked auth
  if (!authChecked) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthPage onAuth={(u) => { setUser(u); setScreen('splash'); }} />;
  }

  return (
    <div className="min-h-screen paper-texture overflow-hidden font-sans">
      {/* Saving indicator */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs text-gray-500 border border-black/5"
          >
            <Save size={12} className="animate-pulse" />
            同步中…
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <SplashScreen
            userEmail={user.email ?? ''}
            onStart={() => setScreen('canvas')}
            onLogout={handleLogout}
            loading={loadingData}
          />
        )}
        {screen === 'canvas' && (
          <MapCanvas
            folders={folders}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onToggleFolder={toggleFolder}
            onOpenNote={openNote}
            onAddFolder={addFolder}
            onDeleteFolder={deleteFolder}
            onRenameFolder={renameFolder}
            onAddNote={addNote}
            onDeleteNote={deleteNote}
            onToggleRead={toggleRead}
            onBack={() => setScreen('splash')}
            userEmail={user.email ?? ''}
            onLogout={handleLogout}
          />
        )}
        {screen === 'detail' && selectedNote && (
          <DetailView
            note={selectedNote}
            folderId={folders.find(f => f.notes.some(n => n.id === selectedNote.id))?.id ?? ''}
            onBack={() => setScreen('canvas')}
            onToggleRead={toggleRead}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────

function SplashScreen({ userEmail, onStart, onLogout, loading }: {
  userEmail: string; onStart: () => void; onLogout: () => void; loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen flex flex-col items-center justify-center relative px-4"
    >
      {/* Top bar */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
        <button onClick={onLogout} className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-red-500">
          <LogOut size={18} />
        </button>
      </div>

      <div className="text-center mb-20">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[56px] font-bold mb-[80px]"
        >
          Map It
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl text-[#666666] font-medium"
        >
          Stop Scattering. Start Mapping.
        </motion.p>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        disabled={loading}
        className="px-10 py-4 bg-[#141414] text-white rounded-full text-lg font-medium shadow-lg z-10 mb-24 flex items-center gap-3 disabled:opacity-60"
      >
        {loading && <Loader2 size={20} className="animate-spin" />}
        {loading ? '加载数据…' : '开始使用'}
      </motion.button>

      <div className="absolute bottom-12 flex gap-12 items-end">
        {[
          { Icon: Cat, size: 48, dur: 3, delay: 0 },
          { Icon: Dog, size: 56, dur: 4, delay: 0.5 },
          { Icon: Flower2, size: 40, dur: 2.5, delay: 1 },
          { Icon: Coins, size: 44, dur: 3.5, delay: 0.2 },
        ].map(({ Icon, size, dur, delay }, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: dur, repeat: Infinity, delay }}
            className="text-[#141414]/60"
          >
            <Icon size={size} strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Map Canvas ───────────────────────────────────────────────────────────────

function MapCanvas({
  folders, viewMode, setViewMode, onToggleFolder, onOpenNote,
  onAddFolder, onDeleteFolder, onRenameFolder, onAddNote, onDeleteNote,
  onToggleRead, onBack, userEmail, onLogout,
}: {
  folders: Folder[]; viewMode: ViewMode; setViewMode: (m: ViewMode) => void;
  onToggleFolder: (id: string) => void; onOpenNote: (n: Note) => void;
  onAddFolder: () => void; onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onAddNote: (folderId: string, note: Note) => void;
  onDeleteNote: (folderId: string, noteId: string) => void;
  onToggleRead: (folderId: string, noteId: string) => void;
  onBack: () => void; userEmail: string; onLogout: () => void;
}) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingNoteToFolder, setAddingNoteToFolder] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteUrl, setNewNoteUrl] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');

  const startEditing = (folder: Folder) => { setEditingFolderId(folder.id); setEditName(folder.name); };
  const saveEdit = () => {
    if (editingFolderId && editName.trim()) onRenameFolder(editingFolderId, editName.trim());
    setEditingFolderId(null);
  };

  const submitNote = (folderId: string) => {
    if (!newNoteTitle.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      title: newNoteTitle.trim(),
      url: newNoteUrl.trim() || '#',
      tags: newNoteTags.split(' ').filter(Boolean),
      isRead: false,
    };
    onAddNote(folderId, note);
    setAddingNoteToFolder(null);
    setNewNoteTitle(''); setNewNoteUrl(''); setNewNoteTags('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen w-full relative overflow-hidden">
      {/* Sidebar */}
      <div className="absolute left-6 top-6 bottom-6 w-72 bg-white/50 backdrop-blur-md rounded-3xl border border-black/5 p-6 z-20 hidden lg:flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-1.5 hover:bg-black/5 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-serif text-2xl font-bold">Library</h2>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-300 max-w-[80px] truncate">{userEmail}</span>
            <button onClick={onLogout} className="p-1.5 hover:bg-red-50 rounded-xl transition-colors text-gray-300 hover:text-red-400">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {folders.map(f => (
            <div key={f.id} className="group">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/80 transition-all cursor-pointer">
                <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onToggleFolder(f.id)}>
                  <FolderIcon size={18} className="text-blue-500 shrink-0" />
                  {editingFolderId === f.id ? (
                    <input
                      autoFocus value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      onBlur={saveEdit}
                      className="bg-white border border-blue-200 rounded px-2 py-0.5 w-full outline-none text-sm font-medium"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-medium text-[#666666] truncate group-hover:text-black">{f.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={e => { e.stopPropagation(); setAddingNoteToFolder(f.id); }} className="p-1 text-gray-400 hover:text-green-600"><Plus size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); startEditing(f); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); onDeleteFolder(f.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              {/* Add note form */}
              {addingNoteToFolder === f.id && (
                <div className="mx-2 mb-2 p-3 bg-white rounded-xl border border-blue-100 space-y-2">
                  <input value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} placeholder="笔记标题 *" className="w-full text-xs px-2 py-1.5 bg-gray-50 rounded-lg outline-none border border-transparent focus:border-blue-200" />
                  <input value={newNoteUrl} onChange={e => setNewNoteUrl(e.target.value)} placeholder="链接 (可选)" className="w-full text-xs px-2 py-1.5 bg-gray-50 rounded-lg outline-none border border-transparent focus:border-blue-200" />
                  <input value={newNoteTags} onChange={e => setNewNoteTags(e.target.value)} placeholder="标签 用空格分隔" className="w-full text-xs px-2 py-1.5 bg-gray-50 rounded-lg outline-none border border-transparent focus:border-blue-200" />
                  <div className="flex gap-2">
                    <button onClick={() => submitNote(f.id)} className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Check size={12} />添加</button>
                    <button onClick={() => setAddingNoteToFolder(null)} className="py-1.5 px-3 bg-gray-100 rounded-lg text-xs text-gray-500"><X size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-black/5 mt-4">
          <button onClick={onAddFolder} className="flex items-center gap-3 text-blue-600 font-bold hover:bg-blue-50 w-full p-3 rounded-xl transition-colors">
            <Plus size={18} />新建文件夹
          </button>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden absolute top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="p-1.5 hover:bg-black/5 rounded-xl"><ArrowLeft size={20} /></button>
        <h2 className="font-serif text-xl font-bold">Map It</h2>
        <button onClick={onAddFolder} className="p-1.5 hover:bg-blue-50 rounded-xl text-blue-500"><Plus size={20} /></button>
      </div>

      {/* Main Canvas */}
      <div className="h-full w-full relative">
        {viewMode === 'mindmap' ? (
          <MindMapView
            folders={folders}
            onToggleFolder={onToggleFolder}
            onOpenNote={onOpenNote}
            onDeleteNote={onDeleteNote}
            onToggleRead={onToggleRead}
            onAddNote={onAddNote}
          />
        ) : (
          <div className="p-6 pt-20 lg:pt-6 lg:pl-80 max-w-6xl mx-auto overflow-y-auto h-full">
            <h2 className="text-3xl font-serif font-bold mb-6">所有笔记</h2>
            {folders.length === 0 && (
              <div className="text-center text-gray-400 py-20">
                <p className="text-lg">还没有任何笔记</p>
                <p className="text-sm mt-2">点击左上角 + 新建文件夹开始</p>
              </div>
            )}
            {folders.map(folder => (
              <div key={folder.id} className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FolderIcon size={14} className="text-blue-400" />{folder.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {folder.notes.map(note => (
                    <div key={note.id} onClick={() => onOpenNote(note)} className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 cursor-pointer hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-base leading-tight">{note.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ml-2 ${note.isRead ? 'bg-gray-100 text-gray-400' : 'bg-yellow-400 text-black'}`}>
                          {note.isRead ? 'Read' : 'New'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map(t => <span key={t} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{t}</span>)}
                      </div>
                    </div>
                  ))}
                  {/* Add note in list view */}
                  {addingNoteToFolder === folder.id ? (
                    <div className="p-4 bg-white rounded-2xl border border-blue-200 space-y-2">
                      <input value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} placeholder="笔记标题 *" className="w-full text-sm px-3 py-2 bg-gray-50 rounded-xl outline-none" />
                      <input value={newNoteUrl} onChange={e => setNewNoteUrl(e.target.value)} placeholder="链接 (可选)" className="w-full text-sm px-3 py-2 bg-gray-50 rounded-xl outline-none" />
                      <input value={newNoteTags} onChange={e => setNewNoteTags(e.target.value)} placeholder="标签 用空格分隔" className="w-full text-sm px-3 py-2 bg-gray-50 rounded-xl outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => submitNote(folder.id)} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold">添加</button>
                        <button onClick={() => setAddingNoteToFolder(null)} className="py-2 px-4 bg-gray-100 rounded-xl text-sm">取消</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingNoteToFolder(folder.id)} className="p-5 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-300 hover:text-gray-500 hover:border-gray-300 transition-all">
                      <Plus size={18} /><span className="text-sm font-bold">添加笔记</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet for folders */}
      <div className="lg:hidden absolute bottom-24 left-4 right-4 z-20">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-black/5 p-3 max-h-40 overflow-y-auto custom-scrollbar">
          {folders.map(f => (
            <div key={f.id} onClick={() => onToggleFolder(f.id)} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
              <FolderIcon size={16} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium truncate">{f.name}</span>
              <span className="text-xs text-gray-400 ml-auto">{f.notes.length}</span>
            </div>
          ))}
          {folders.length === 0 && <p className="text-xs text-gray-400 text-center py-2">点击右上角 + 新建文件夹</p>}
        </div>
      </div>

      {/* View Switcher */}
      <div className="absolute bottom-8 right-8 flex bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-black/5 z-30">
        {([['mindmap', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`p-3 rounded-full transition-all ${viewMode === mode ? 'bg-[#141414] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
            <Icon size={20} />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Mind Map View ────────────────────────────────────────────────────────────

function MindMapView({ folders, onToggleFolder, onOpenNote, onDeleteNote, onToggleRead, onAddNote }: {
  folders: Folder[]; onToggleFolder: (id: string) => void; onOpenNote: (n: Note) => void;
  onDeleteNote: (folderId: string, noteId: string) => void;
  onToggleRead: (folderId: string, noteId: string) => void;
  onAddNote: (folderId: string, note: Note) => void;
}) {
  const getPosition = (index: number, total: number, radius: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  return (
    <div className="h-full w-full flex items-center justify-center relative overflow-hidden pt-14 lg:pt-0">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {folders.map((folder, i) => {
          const pos = getPosition(i, folders.length, 260);
          const startX = window.innerWidth / 2;
          const startY = window.innerHeight / 2;
          const endX = startX + pos.x;
          const endY = startY + pos.y;
          return (
            <path key={`line-${folder.id}`}
              d={`M ${startX} ${startY} C ${startX + pos.x * 0.5} ${startY}, ${startX + pos.x * 0.5} ${endY}, ${endX} ${endY}`}
              stroke="#3B82F6" strokeWidth="3" fill="none" strokeOpacity="0.25"
            />
          );
        })}
      </svg>

      {/* Center node */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 bg-blue-500 text-white p-8 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] shadow-2xl flex flex-col items-center gap-2"
      >
        <Cloud size={36} fill="currentColor" />
        <h1 className="font-serif text-2xl font-bold">My Mind</h1>
      </motion.div>

      {/* Folder nodes */}
      {folders.map((folder, i) => {
        const pos = getPosition(i, folders.length, 260);
        const unread = folder.notes.filter(n => !n.isRead).length;
        const isOverloaded = unread > 10;

        return (
          <React.Fragment key={folder.id}>
            <motion.div
              animate={{ scale: isOverloaded ? 1.12 : 1, x: pos.x, y: pos.y }}
              whileHover={{ scale: isOverloaded ? 1.17 : 1.05 }}
              onClick={() => onToggleFolder(folder.id)}
              className={`absolute w-44 p-4 rounded-3xl shadow-sm border cursor-pointer flex flex-col gap-1
                ${isOverloaded ? 'bg-red-50 border-red-200' : 'bg-[#FAF9F6] border-black/5 hover:bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <span className={`font-bold text-base leading-tight ${isOverloaded ? 'text-red-700' : 'text-black'}`}>{folder.name}</span>
                {isOverloaded && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse mt-1 shrink-0" />}
              </div>
              <span className="text-xs text-gray-500">{folder.notes.length} 条笔记</span>
            </motion.div>

            {folder.isExpanded && folder.notes.map((note, ni) => {
              const angle = Math.atan2(pos.y, pos.x);
              const noteAngle = (ni / Math.max(folder.notes.length, 1)) * 0.8 - 0.4;
              const noteRadius = 175;
              const noteX = pos.x + Math.cos(noteAngle + angle) * noteRadius;
              const noteY = pos.y + Math.sin(noteAngle + angle) * noteRadius;

              return (
                <motion.div key={note.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, x: noteX, y: noteY }}
                  whileHover={{ y: noteY - 4 }}
                  className="absolute w-52 bg-white p-4 rounded-xl shadow-md border border-black/5 cursor-pointer z-20 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start gap-1" onClick={() => onOpenNote(note)}>
                    <h3 className="font-bold text-sm leading-tight">{note.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${note.isRead ? 'bg-gray-100 text-gray-400' : 'bg-yellow-400 text-black'}`}>
                      {note.isRead ? 'Read' : 'New'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map(t => <span key={t} className="text-[10px] bg-gray-50 border border-black/5 px-2 py-0.5 rounded-full text-gray-500">{t}</span>)}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => onToggleRead(folder.id, note.id)} className="flex-1 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-colors">
                      {note.isRead ? '标为未读' : '标为已读'}
                    </button>
                    <button onClick={() => onDeleteNote(folder.id, note.id)} className="py-1.5 px-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailView({ note, folderId, onBack, onToggleRead }: {
  note: Note; folderId: string; onBack: () => void;
  onToggleRead: (folderId: string, noteId: string) => void;
}) {
  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-screen w-full bg-white flex flex-col"
    >
      <header className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={22} /></button>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 flex-wrap justify-end">
            {note.tags.map(t => <span key={t} className="text-xs bg-gray-100 px-2.5 py-1 rounded-full text-gray-500">{t}</span>)}
          </div>
          {note.url && note.url !== '#' && (
            <a href={note.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 shrink-0">
              <ExternalLink size={14} />原链接
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-12 px-6">
          {note.url && note.url !== '#' && (
            <a href={note.url} target="_blank" rel="noopener noreferrer"
              className="mb-10 p-5 bg-gray-50 rounded-2xl border border-black/5 flex items-center justify-between group hover:bg-gray-100 transition-colors block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <ExternalLink size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">来源链接</p>
                  <p className="font-bold text-sm truncate max-w-[200px]">{note.url}</p>
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-gray-500 shrink-0" />
            </a>
          )}

          <h1 className="text-4xl font-serif font-bold mb-6">{note.title}</h1>

          <button
            onClick={() => { onToggleRead(folderId, note.id); onBack(); }}
            className={`mb-8 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              note.isRead
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-yellow-400 text-black hover:bg-yellow-300'
            }`}
          >
            {note.isRead ? '✓ 已读 — 标为未读' : '标为已读'}
          </button>

          {note.content ? (
            <div className="prose prose-lg max-w-none text-[#333] leading-relaxed whitespace-pre-wrap">{note.content}</div>
          ) : (
            <div className="text-gray-400 text-sm py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
              暂无内容备注
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}
