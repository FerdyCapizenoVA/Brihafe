import { useState, useEffect, useMemo } from "react";
import {
  Heart,
  MessageCircle,
  ImagePlus,
  LogOut,
  Send,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ===== constants =====

const DATA_KEY = "brihafe-data";
const SHARED = true;

const REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "love", emoji: "❤️", label: "Love" },
  { id: "haha", emoji: "😂", label: "Haha" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😡", label: "Angry" },
];

// ===== helpers =====

async function sha256(s) {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadData() {
  try {
    const r = await window.storage.get(DATA_KEY, SHARED);
    if (!r) return { users: [], posts: [], comments: [] };
    const parsed = JSON.parse(r.value);
    return {
      users: parsed.users || [],
      posts: parsed.posts || [],
      comments: parsed.comments || [],
    };
  } catch {
    return { users: [], posts: [], comments: [] };
  }
}

async function saveData(data) {
  try {
    const r = await window.storage.set(DATA_KEY, JSON.stringify(data), SHARED);
    return !!r;
  } catch {
    return false;
  }
}

function colorFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const palette = [
    "#d94f3e",
    "#e8924b",
    "#caa64a",
    "#7ba05b",
    "#4a8a8c",
    "#5a6fb0",
    "#9b6bb0",
    "#c45a8e",
  ];
  return palette[Math.abs(h) % palette.length];
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ===== shared UI =====

function Avatar({ user, size = 40 }) {
  if (!user) {
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: "#cbb9a4" }}
      />
    );
  }
  const name = user.displayName || user.username || "?";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = colorFromString(user.username || name);
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0 select-none"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.38,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

function DemoBanner() {
  return (
    <div
      className="text-xs px-4 py-2 text-center"
      style={{
        background: "#fde8e3",
        color: "#7a2d22",
        borderBottom: "1px solid #f3c8bf",
      }}
    >
      <strong>Demo prototype</strong> — accounts and posts are visible to
      anyone using this artifact. Don't post anything private and don't reuse
      a real password.
    </div>
  );
}

// ===== auth screen =====

function AuthScreen({ users, onLogin, onSignup, error }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    if (mode === "login") {
      await onLogin({
        username: username.trim().toLowerCase(),
        passphrase,
      });
    } else {
      await onSignup({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim() || username.trim(),
        passphrase,
      });
    }
    setBusy(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1
              className="text-7xl tracking-tight leading-none mb-3"
              style={{
                fontFamily: "Fraunces, serif",
                color: "var(--ink)",
                fontWeight: 600,
                fontVariationSettings: "'SOFT' 100, 'WONK' 1",
                letterSpacing: "-0.04em",
              }}
            >
              brihafe
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
            >
              A small place to post things and see what your people are up to.
            </p>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div
              className="flex gap-1 mb-5 p-1 rounded-full"
              style={{ background: "var(--bg)" }}
            >
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: mode === m ? "var(--surface)" : "transparent",
                    color: mode === m ? "var(--ink)" : "var(--ink-soft)",
                    boxShadow:
                      mode === m ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label
                  className="block text-[11px] uppercase tracking-[0.12em] mb-1.5 font-medium"
                  style={{ color: "var(--ink-soft)" }}
                >
                  Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg outline-none focus:ring-2"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                  }}
                  placeholder="e.g. ferdy"
                  autoComplete="username"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label
                    className="block text-[11px] uppercase tracking-[0.12em] mb-1.5 font-medium"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    Display name
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                    }}
                    placeholder="Your name (optional)"
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-[11px] uppercase tracking-[0.12em] mb-1.5 font-medium"
                  style={{ color: "var(--ink-soft)" }}
                >
                  Passphrase
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                  }}
                  placeholder="At least 4 characters"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--ink-soft)" }}
                >
                  Use a unique throwaway one. This is a demo, not a vault.
                </p>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2 p-2.5 rounded-lg text-sm"
                  style={{ background: "#fde8e3", color: "#7a2d22" }}
                >
                  <AlertCircle
                    size={16}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-lg font-medium transition-opacity"
                style={{
                  background: "var(--accent)",
                  color: "white",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? (
                  <Loader2 className="animate-spin inline" size={16} />
                ) : mode === "login" ? (
                  "Log in"
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--ink-soft)" }}
            >
              {users.length}{" "}
              {users.length === 1 ? "person has" : "people have"} joined Brihafe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== composer =====

function Composer({ currentUser, onPost }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [busy, setBusy] = useState(false);

  const canPost =
    content.trim().length > 0 || imageUrl.trim().length > 0;

  const submit = async () => {
    if (!canPost || busy) return;
    setBusy(true);
    const ok = await onPost({
      content: content.trim(),
      imageUrl: imageUrl.trim(),
    });
    if (ok) {
      setContent("");
      setImageUrl("");
      setShowImage(false);
    }
    setBusy(false);
  };

  const firstName = (currentUser.displayName || currentUser.username).split(
    " "
  )[0];

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex gap-3">
        <Avatar user={currentUser} size={40} />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${firstName}?`}
            maxLength={500}
            rows={2}
            className="w-full resize-none outline-none bg-transparent text-base"
            style={{ color: "var(--ink)" }}
          />

          {showImage && (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://image-url.jpg"
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setShowImage(false);
                  setImageUrl("");
                }}
                className="p-1.5 rounded-full"
                style={{ color: "var(--ink-soft)" }}
                title="Cancel image"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {imageUrl && (
            <div
              className="mt-2 rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src={imageUrl}
                alt="preview"
                className="w-full max-h-80 object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}

          <div
            className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setShowImage(!showImage)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors"
              style={{
                color: showImage ? "var(--accent)" : "var(--ink-soft)",
              }}
            >
              <ImagePlus size={16} />
              <span>Image</span>
            </button>
            <div className="flex items-center gap-3">
              <span
                className="text-xs tabular-nums"
                style={{ color: "var(--ink-soft)" }}
              >
                {500 - content.length}
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={!canPost || busy}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-opacity"
                style={{
                  background: "var(--accent)",
                  color: "white",
                  opacity: !canPost || busy ? 0.4 : 1,
                }}
              >
                {busy ? (
                  <Loader2 className="animate-spin inline" size={14} />
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== reaction bar =====

function ReactionBar({ post, currentUser, onReact }) {
  const [open, setOpen] = useState(false);
  const myReaction = useMemo(() => {
    for (const r of REACTIONS) {
      if ((post.reactions[r.id] || []).includes(currentUser.id)) return r.id;
    }
    return null;
  }, [post.reactions, currentUser.id]);

  const totals = REACTIONS.map((r) => ({
    ...r,
    count: (post.reactions[r.id] || []).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalCount = totals.reduce((s, r) => s + r.count, 0);
  const myEmoji = REACTIONS.find((r) => r.id === myReaction)?.emoji;
  const myLabel = REACTIONS.find((r) => r.id === myReaction)?.label;

  return (
    <div
      className="flex items-center justify-between"
      style={{ color: "var(--ink-soft)" }}
    >
      <div className="flex items-center gap-1 min-h-[24px]">
        {totals.slice(0, 3).map((r) => (
          <span key={r.id} className="text-base leading-none">
            {r.emoji}
          </span>
        ))}
        {totalCount > 0 && (
          <span className="text-sm ml-1.5">{totalCount}</span>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            color: myReaction ? "var(--accent)" : "var(--ink-soft)",
            fontWeight: myReaction ? 600 : 400,
          }}
        >
          {myEmoji ? (
            <span className="text-base leading-none">{myEmoji}</span>
          ) : (
            <Heart size={16} />
          )}
          <span>{myReaction ? myLabel : "React"}</span>
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute bottom-full mb-2 right-0 flex gap-1 p-1.5 rounded-full z-20"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              }}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onReact(post.id, r.id);
                    setOpen(false);
                  }}
                  className="text-2xl p-1 rounded-full hover:scale-125 transition-transform leading-none"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== comments =====

function CommentItem({ comment, user }) {
  return (
    <div className="flex gap-2">
      <Avatar user={user} size={28} />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl px-3 py-2"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="text-xs font-semibold"
            style={{ color: "var(--ink)" }}
          >
            {user?.displayName || "Unknown"}
          </div>
          <div
            className="text-sm whitespace-pre-wrap break-words"
            style={{ color: "var(--ink)" }}
          >
            {comment.content}
          </div>
        </div>
        <div
          className="text-xs mt-0.5 ml-3"
          style={{ color: "var(--ink-soft)" }}
        >
          {timeAgo(comment.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ===== post card =====

function PostCard({
  post,
  author,
  currentUser,
  comments,
  users,
  onReact,
  onComment,
}) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const postComments = comments
    .filter((c) => c.postId === post.id)
    .sort((a, b) => a.createdAt - b.createdAt);

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    const ok = await onComment(post.id, text);
    if (ok) {
      setDraft("");
      setShowComments(true);
    }
    setBusy(false);
  };

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar user={author} size={44} />
          <div className="min-w-0">
            <div
              className="font-semibold truncate"
              style={{ color: "var(--ink)" }}
            >
              {author?.displayName || "Unknown user"}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: "var(--ink-soft)" }}
            >
              @{author?.username || "unknown"} · {timeAgo(post.createdAt)}
            </div>
          </div>
        </div>
        {post.content && (
          <p
            className="whitespace-pre-wrap break-words mb-3 text-[15px] leading-relaxed"
            style={{ color: "var(--ink)" }}
          >
            {post.content}
          </p>
        )}
      </div>
      {post.imageUrl && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <img
            src={post.imageUrl}
            alt=""
            className="w-full max-h-[600px] object-contain"
            style={{ background: "#1f1a16" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}
      <div className="px-4 py-2">
        <ReactionBar
          post={post}
          currentUser={currentUser}
          onReact={onReact}
        />
      </div>
      <div
        style={{ borderTop: "1px solid var(--border)" }}
        className="px-4 py-3"
      >
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--ink-soft)" }}
        >
          <MessageCircle size={16} />
          <span>
            {postComments.length}{" "}
            {postComments.length === 1 ? "comment" : "comments"}
          </span>
        </button>

        {showComments && (
          <div className="mt-3 space-y-3">
            {postComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                user={users.find((u) => u.id === c.userId)}
              />
            ))}
            <div className="flex gap-2 items-center pt-1">
              <Avatar user={currentUser} size={28} />
              <div className="flex-1 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                  placeholder="Write a comment…"
                  maxLength={300}
                  className="flex-1 px-3 py-2 rounded-full text-sm outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!draft.trim() || busy}
                  className="p-2 rounded-full transition-opacity"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                    opacity: !draft.trim() || busy ? 0.4 : 1,
                  }}
                  title="Send"
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ===== feed =====

function Feed({
  posts,
  comments,
  users,
  currentUser,
  onPost,
  onReact,
  onComment,
  onLogout,
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <DemoBanner />
      <header
        className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          background: "rgba(250, 245, 237, 0.92)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1
          className="text-3xl tracking-tight leading-none"
          style={{
            fontFamily: "Fraunces, serif",
            color: "var(--ink)",
            fontWeight: 600,
            fontVariationSettings: "'SOFT' 100, 'WONK' 1",
            letterSpacing: "-0.03em",
          }}
        >
          brihafe
        </h1>
        <div className="flex items-center gap-3">
          <Avatar user={currentUser} size={36} />
          <div className="hidden sm:block leading-tight">
            <div
              className="text-sm font-medium"
              style={{ color: "var(--ink)" }}
            >
              {currentUser.displayName}
            </div>
            <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
              @{currentUser.username}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-full transition-colors"
            style={{ color: "var(--ink-soft)" }}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <Composer currentUser={currentUser} onPost={onPost} />
        {posts.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border)",
            }}
          >
            <p
              className="text-lg mb-1"
              style={{
                color: "var(--ink)",
                fontFamily: "Fraunces, serif",
                fontStyle: "italic",
              }}
            >
              It's quiet here.
            </p>
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Be the first to post something.
            </p>
          </div>
        ) : (
          [...posts]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((p) => (
              <PostCard
                key={p.id}
                post={p}
                author={users.find((u) => u.id === p.userId)}
                currentUser={currentUser}
                comments={comments}
                users={users}
                onReact={onReact}
                onComment={onComment}
              />
            ))
        )}
        <footer
          className="text-xs text-center py-8"
          style={{ color: "var(--ink-soft)" }}
        >
          Brihafe · A toy social network · Be kind
        </footer>
      </main>
    </div>
  );
}

// ===== root =====

export default function App() {
  const [data, setData] = useState({ users: [], posts: [], comments: [] });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // initial load + periodic refresh so users see each other's posts
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const fresh = await loadData();
      if (alive) setData(fresh);
    };
    tick().then(() => {
      if (alive) setLoading(false);
    });
    const id = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // re-load before write to reduce overwrites in last-write-wins storage
  const writeData = async (updater) => {
    const fresh = await loadData();
    const next = updater(fresh);
    const ok = await saveData(next);
    if (ok) setData(next);
    return ok;
  };

  const handleSignup = async ({ username, displayName, passphrase }) => {
    setAuthError("");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setAuthError("Username must be 3–20 letters, numbers, or underscores.");
      return;
    }
    if (passphrase.length < 4) {
      setAuthError("Passphrase must be at least 4 characters.");
      return;
    }
    const fresh = await loadData();
    if (fresh.users.find((u) => u.username === username)) {
      setAuthError("That username is taken. Try logging in instead.");
      return;
    }
    const passHash = await sha256(passphrase);
    const newUser = {
      id: newId(),
      username,
      displayName: displayName || username,
      passHash,
      createdAt: Date.now(),
    };
    const next = { ...fresh, users: [...fresh.users, newUser] };
    const ok = await saveData(next);
    if (ok) {
      setData(next);
      setCurrentUser(newUser);
    } else {
      setAuthError("Could not save account. Try again.");
    }
  };

  const handleLogin = async ({ username, passphrase }) => {
    setAuthError("");
    const fresh = await loadData();
    setData(fresh);
    const user = fresh.users.find((u) => u.username === username);
    if (!user) {
      setAuthError("No account with that username.");
      return;
    }
    const passHash = await sha256(passphrase);
    if (user.passHash !== passHash) {
      setAuthError("Wrong passphrase.");
      return;
    }
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthError("");
  };

  const handlePost = async ({ content, imageUrl }) => {
    if (!currentUser) return false;
    return await writeData((d) => ({
      ...d,
      posts: [
        ...d.posts,
        {
          id: newId(),
          userId: currentUser.id,
          content,
          imageUrl,
          createdAt: Date.now(),
          reactions: {},
        },
      ],
    }));
  };

  const handleReact = async (postId, reactionId) => {
    if (!currentUser) return;
    await writeData((d) => ({
      ...d,
      posts: d.posts.map((p) => {
        if (p.id !== postId) return p;
        const reactions = { ...p.reactions };
        // remove this user from any prior reaction
        for (const key of Object.keys(reactions)) {
          reactions[key] = (reactions[key] || []).filter(
            (userId) => userId !== currentUser.id
          );
        }
        // toggle: add unless they already had this exact reaction
        const had = (p.reactions[reactionId] || []).includes(currentUser.id);
        if (!had) {
          reactions[reactionId] = [
            ...(reactions[reactionId] || []),
            currentUser.id,
          ];
        }
        return { ...p, reactions };
      }),
    }));
  };

  const handleComment = async (postId, content) => {
    if (!currentUser) return false;
    return await writeData((d) => ({
      ...d,
      comments: [
        ...d.comments,
        {
          id: newId(),
          postId,
          userId: currentUser.id,
          content,
          createdAt: Date.now(),
        },
      ],
    }));
  };

  // theme as CSS variables on the root
  const themeStyles = {
    "--bg": "#faf5ed",
    "--surface": "#ffffff",
    "--ink": "#1f1a16",
    "--ink-soft": "#7a6a5d",
    "--accent": "#d94f3e",
    "--border": "#ece1d0",
  };

  return (
    <div style={themeStyles} className="font-sans antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,30..100,0..1;1,9..144,300..900,30..100,0..1&family=DM+Sans:opsz,wght@9..40,300..700&display=swap');
        .font-sans, body { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        textarea, input, button { font-family: inherit; }
        textarea::placeholder, input::placeholder { color: var(--ink-soft); opacity: 0.7; }
        textarea:focus, input:focus { border-color: var(--accent) !important; }
        button:not(:disabled) { cursor: pointer; }
      `}</style>

      {loading ? (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--bg)" }}
        >
          <Loader2
            className="animate-spin"
            style={{ color: "var(--accent)" }}
            size={32}
          />
        </div>
      ) : !currentUser ? (
        <AuthScreen
          users={data.users}
          onLogin={handleLogin}
          onSignup={handleSignup}
          error={authError}
        />
      ) : (
        <Feed
          posts={data.posts}
          comments={data.comments}
          users={data.users}
          currentUser={currentUser}
          onPost={handlePost}
          onReact={handleReact}
          onComment={handleComment}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
