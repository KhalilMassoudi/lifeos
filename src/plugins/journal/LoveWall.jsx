import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { useNotesStore, NOTE_COLORS } from './notesStore';
import { useAuthStore } from '../../store/authStore';
import { ProfileAvatar } from '../../components/profile/ProfileBits';
import { btn } from '../../components/ui/Modal';

const STICKERS = ['💌', '🥰', '🌹', '🌙', '☕', '🤍', '🧸', '✨'];
const MAX_LENGTH = 500;

export default function LoveWall() {
  const { notes, loaded, fetchNotes, createNote, deleteNote } = useNotesStore();
  const { currentUser, profiles } = useAuthStore();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchNotes('love_note'); }, [fetchNotes]);

  const others = profiles.filter(p => p.id !== currentUser.id);
  const partnerNames = others.map(p => p.name).join(' & ');

  const send = async (e) => {
    e?.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      // Paper color follows the writer's own color, so each of you has a recognizable look
      const paper = NOTE_COLORS[currentUser.color] ? currentUser.color : 'blush';
      await createNote({ type: 'love_note', content: message, color_tag: paper });
      setMessage('');
    } catch { /* toast shown */ }
    setSending(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="text-center mb-7">
          <h2 className="font-display text-4xl font-semibold text-ink">
            Our <span className="gold-text italic">little wall</span>
          </h2>
          <p className="text-ink-muted mt-1.5">
            {others.length
              ? <>Leave a sweet note for {partnerNames} — they'll see it here 💞</>
              : 'Add your partner\'s profile in Settings so they can see your notes here.'}
          </p>
        </div>

        {/* Composer */}
        <form onSubmit={send} className="rounded-[28px] bg-surface shadow-lift border border-paper p-5 mb-10">
          <div className="flex gap-3">
            <ProfileAvatar profile={currentUser} size="md" />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(); }}
              placeholder={others.length ? `Write something for ${others[0].name}…` : 'Write something sweet…'}
              aria-label="Love note"
              rows={3}
              className="flex-1 resize-none bg-transparent text-[15px] text-ink placeholder-ink-faint focus:outline-none pt-2"
            />
          </div>
          <div className="flex items-center gap-1 mt-3 pl-14 flex-wrap">
            {STICKERS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setMessage(m => (m + s).slice(0, MAX_LENGTH))}
                className="w-8 h-8 rounded-full text-lg hover:bg-accent-50 hover:scale-110 transition-all"
                aria-label={`Add ${s}`}
              >
                {s}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-ink-faint mr-2">{message.length}/{MAX_LENGTH}</span>
            <button type="submit" className={btn.primary} disabled={!message.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
            </button>
          </div>
        </form>

        {/* Wall */}
        {!loaded.love_note ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-accent-400 animate-spin" /></div>
        ) : notes.love_note.length === 0 ? (
          <div className="text-center py-10 text-ink-muted">
            <div className="text-5xl mb-3 animate-float inline-block">💌</div>
            <p className="font-semibold">No notes yet. Be the first to leave one!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {notes.love_note.map((note, i) => {
              const mine = note.user_id === currentUser.id;
              const c = NOTE_COLORS[note.author.color] || NOTE_COLORS[note.color_tag] || NOTE_COLORS.blush;
              return (
                <article
                  key={note.id}
                  className="group relative rounded-[24px] p-5 pt-6 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
                  style={{ background: c.bg, transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}
                >
                  {/* washi tape */}
                  <span
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 rounded-sm opacity-80"
                    style={{ background: c.edge, transform: `translateX(-50%) rotate(${i % 2 ? -3 : 3}deg)` }}
                    aria-hidden="true"
                  />
                  <p className="font-display italic text-lg leading-relaxed whitespace-pre-wrap break-words" style={{ color: c.ink }}>
                    {note.content}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <ProfileAvatar profile={note.author} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-ink truncate">{mine ? 'You' : note.author.name}</p>
                      <p className="text-[11px] text-ink-muted">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</p>
                    </div>
                    {mine && (
                      <button
                        onClick={() => { if (window.confirm('Remove this note from the wall?')) deleteNote(note.id); }}
                        className="ml-auto p-1.5 rounded-full text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-paper/70 transition-opacity"
                        aria-label="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
