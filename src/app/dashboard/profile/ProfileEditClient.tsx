'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Trophy } from '@/types';
import styles from './ProfileEditClient.module.css';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function ProfileEditClient({
  profile: initialProfile,
  trophies: initialTrophies,
}: {
  profile: Profile;
  trophies: Trophy[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [nickname, setNickname] = useState(initialProfile.nickname ?? '');
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? '');
  const [achievements, setAchievements] = useState<string[]>(initialProfile.achievements ?? []);
  const [newAchievement, setNewAchievement] = useState('');
  const [externalLinks, setExternalLinks] = useState(initialProfile.external_links ?? []);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Trophy state
  const [trophies, setTrophies] = useState<Trophy[]>(initialTrophies);
  const [showTrophyForm, setShowTrophyForm] = useState(false);
  const [trophyLoading, setTrophyLoading] = useState(false);
  const [trophyForm, setTrophyForm] = useState({
    placement: '',
    tournament_name: '',
    prize_amount: '',
    tournament_date: '',
  });
  const [trophyPhotoFile, setTrophyPhotoFile] = useState<File | null>(null);
  const [trophyPhotoPreview, setTrophyPhotoPreview] = useState('');
  const trophyInputRef = useRef<HTMLInputElement>(null);

  // ── Avatar Upload ──
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop();
    const filePath = `${initialProfile.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      setError(`Erro no upload: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache buster
    const url = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    // Update profile immediately
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', initialProfile.id);
    setUploading(false);
  }

  // ── Save Profile ──
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const { error: err } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      nickname: nickname.trim() || null,
      bio: bio.trim() || null,
      achievements: achievements.length > 0 ? achievements : null,
      external_links: externalLinks.length > 0 ? externalLinks : null,
    }).eq('id', initialProfile.id);

    if (err) {
      setError(err.message);
    } else {
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  // ── Achievements helpers ──
  function addAchievement() {
    if (newAchievement.trim()) {
      setAchievements([...achievements, newAchievement.trim()]);
      setNewAchievement('');
    }
  }
  function removeAchievement(index: number) {
    setAchievements(achievements.filter((_, i) => i !== index));
  }

  // ── External Links helpers ──
  function addLink() {
    setExternalLinks([...externalLinks, { label: '', url: '' }]);
  }
  function updateLink(index: number, field: 'label' | 'url', value: string) {
    const updated = [...externalLinks];
    updated[index] = { ...updated[index], [field]: value };
    setExternalLinks(updated);
  }
  function removeLink(index: number) {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  }

  // ── Trophy Photo ──
  function handleTrophyPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('A foto do troféu deve ter no máximo 5MB.');
      return;
    }
    setTrophyPhotoFile(file);
    setTrophyPhotoPreview(URL.createObjectURL(file));
  }

  // ── Add Trophy ──
  async function handleAddTrophy(e: React.FormEvent) {
    e.preventDefault();
    if (!trophyPhotoFile) { setError('Selecione uma foto para o troféu.'); return; }
    setTrophyLoading(true);
    setError('');

    // Upload photo
    const ext = trophyPhotoFile.name.split('.').pop();
    const filePath = `${initialProfile.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('trophies')
      .upload(filePath, trophyPhotoFile);

    if (uploadErr) {
      setError(`Erro no upload: ${uploadErr.message}`);
      setTrophyLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('trophies')
      .getPublicUrl(filePath);

    // Insert trophy record
    const { data: newTrophy, error: insertErr } = await supabase.from('trophies').insert({
      player_id: initialProfile.id,
      photo_url: publicUrl,
      placement: trophyForm.placement,
      tournament_name: trophyForm.tournament_name,
      prize_amount: trophyForm.prize_amount ? parseFloat(trophyForm.prize_amount) : null,
      tournament_date: trophyForm.tournament_date,
    }).select().single();

    if (insertErr) {
      setError(insertErr.message);
      setTrophyLoading(false);
      return;
    }

    setTrophies([newTrophy, ...trophies]);
    setShowTrophyForm(false);
    setTrophyForm({ placement: '', tournament_name: '', prize_amount: '', tournament_date: '' });
    setTrophyPhotoFile(null);
    setTrophyPhotoPreview('');
    setTrophyLoading(false);
  }

  // ── Delete Trophy ──
  async function handleDeleteTrophy(trophy: Trophy) {
    if (!confirm('Excluir este troféu?')) return;

    // Delete storage file
    const urlParts = trophy.photo_url.split('/trophies/');
    if (urlParts[1]) {
      await supabase.storage.from('trophies').remove([urlParts[1]]);
    }

    await supabase.from('trophies').delete().eq('id', trophy.id);
    setTrophies(trophies.filter(t => t.id !== trophy.id));
  }

  return (
    <div className="container-sm">
      <div className="page-header">
        <p className="section-label">
          <Link href="/dashboard">Dashboard</Link> / Editar perfil
        </p>
        <h1>Editar perfil</h1>
      </div>

      <div style={{ paddingBottom: 'var(--space-16)' }}>
        {/* ── Avatar Section ── */}
        <div className={`card ${styles.avatarSection}`}>
          <div className={styles.avatarPreview}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              className={`btn btn-outline btn-sm ${styles.avatarBtn}`}
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Enviando...' : '📷 Alterar foto'}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className={styles.hiddenInput}
            />
            <span className="form-hint">JPEG, PNG ou WebP · Máx 2MB</span>
          </div>
        </div>

        {/* ── Profile Form ── */}
        <form onSubmit={handleSaveProfile} className={styles.form}>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Informações básicas</h3>
            <div className="flex flex-col gap-4">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-display-name">Nome de exibição *</label>
                  <input
                    id="edit-display-name"
                    type="text"
                    className="form-input"
                    placeholder="Seu nome"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nickname">Apelido</label>
                  <input
                    id="edit-nickname"
                    type="text"
                    className="form-input"
                    placeholder="Seu apelido no poker"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                  <span className="form-hint">Exibido no perfil público</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-bio">Bio</label>
                <textarea
                  id="edit-bio"
                  className="form-textarea"
                  placeholder="Conte um pouco sobre você, sua história no poker, estilo de jogo..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Conquistas</h3>
            <div className="flex flex-col gap-3">
              {achievements.map((a, i) => (
                <div key={i} className={styles.achievementRow}>
                  <span className={styles.achievementTag}>🏆 {a}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeAchievement(i)}
                    style={{ color: 'var(--color-danger)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className={styles.addRow}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: Campeão BSOP Millions 2025"
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAchievement(); } }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addAchievement}
                  disabled={!newAchievement.trim()}
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* External Links */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Links externos</h3>
            <div className="flex flex-col gap-3">
              {externalLinks.map((link, i) => (
                <div key={i} className={styles.linkRow}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nome (ex: Hendon Mob)"
                    value={link.label}
                    onChange={(e) => updateLink(i, 'label', e.target.value)}
                  />
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateLink(i, 'url', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeLink(i)}
                    style={{ color: 'var(--color-danger)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={addLink} style={{ alignSelf: 'flex-start' }}>
                + Adicionar link
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="flex gap-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              id="profile-save"
            >
              {saving ? 'Salvando...' : '✓ Salvar perfil'}
            </button>
            <Link href="/dashboard" className="btn btn-ghost">Voltar</Link>
          </div>
        </form>

        {/* ── Trophy Showcase ── */}
        {initialProfile.role === 'player' && (
          <div className={styles.trophySection}>
            <div className={styles.trophyHeader}>
              <h2>🏆 Vitrine de Troféus</h2>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => setShowTrophyForm(!showTrophyForm)}
              >
                {showTrophyForm ? 'Cancelar' : '+ Adicionar troféu'}
              </button>
            </div>

            {/* Add trophy form */}
            {showTrophyForm && (
              <form onSubmit={handleAddTrophy} className={`card ${styles.trophyForm}`}>
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Novo troféu</h3>

                {/* Photo upload */}
                <div className={styles.trophyPhotoUpload}>
                  {trophyPhotoPreview ? (
                    <div className={styles.trophyPreviewWrap}>
                      <img src={trophyPhotoPreview} alt="Preview" className={styles.trophyPreviewImg} />
                      <button
                        type="button"
                        className={`btn btn-ghost btn-sm ${styles.changePhotoBtn}`}
                        onClick={() => trophyInputRef.current?.click()}
                      >
                        Trocar foto
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.trophyUploadBtn}
                      onClick={() => trophyInputRef.current?.click()}
                    >
                      <span className={styles.trophyUploadIcon}>📸</span>
                      <span>Selecionar foto</span>
                      <span className="form-hint">JPEG, PNG ou WebP · Máx 5MB</span>
                    </button>
                  )}
                  <input
                    ref={trophyInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleTrophyPhotoChange}
                    className={styles.hiddenInput}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Colocação *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ex: 1º lugar, Final table"
                      value={trophyForm.placement}
                      onChange={(e) => setTrophyForm({ ...trophyForm, placement: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nome do torneio *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ex: BSOP Main Event"
                      value={trophyForm.tournament_name}
                      onChange={(e) => setTrophyForm({ ...trophyForm, tournament_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Premiação (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="form-input"
                      placeholder="Opcional"
                      value={trophyForm.prize_amount}
                      onChange={(e) => setTrophyForm({ ...trophyForm, prize_amount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data do torneio *</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ colorScheme: 'dark' }}
                      value={trophyForm.tournament_date}
                      onChange={(e) => setTrophyForm({ ...trophyForm, tournament_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={trophyLoading || !trophyPhotoFile}
                  id="trophy-submit"
                >
                  {trophyLoading ? 'Publicando...' : '🏆 Publicar troféu'}
                </button>
              </form>
            )}

            {/* Trophy grid */}
            {trophies.length === 0 && !showTrophyForm ? (
              <div className="empty-state" style={{ padding: 'var(--space-10) var(--space-6)' }}>
                <div className="empty-state-icon">🏆</div>
                <h3>Nenhum troféu na vitrine</h3>
                <p>Adicione suas conquistas para que investidores vejam seu histórico.</p>
              </div>
            ) : (
              <div className={styles.trophyGrid}>
                {trophies.map((trophy) => (
                  <div key={trophy.id} className={`card ${styles.trophyCard}`}>
                    <div className={styles.trophyImgWrap}>
                      <img src={trophy.photo_url} alt={trophy.tournament_name} className={styles.trophyImg} />
                      <span className={styles.trophyPlacement}>{trophy.placement}</span>
                    </div>
                    <div className={styles.trophyInfo}>
                      <h4 className={styles.trophyName}>{trophy.tournament_name}</h4>
                      <div className={styles.trophyMeta}>
                        <span>📅 {formatDate(trophy.tournament_date)}</span>
                        {trophy.prize_amount && (
                          <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>
                            {formatBRL(trophy.prize_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${styles.trophyDelete}`}
                      onClick={() => handleDeleteTrophy(trophy)}
                      title="Excluir troféu"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
