import React, { useState } from 'react';
import { LogIn, SunMedium, Shield } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { UserSession } from '../helpers/storage';
import { BorexLogo } from './BorexLogo';
import styles from './AuthView.module.css';

interface AuthViewProps {
  onSignIn: (user: UserSession) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSignIn }) => {
  const [name, setName] = useState('Field Engineer');
  const [email, setEmail] = useState('engineer@borex.energy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSignIn({
      name: name.trim(),
      email: email.trim()
    });
  };

  return (
    <main className={styles.authContainer}>
      <div className={styles.card}>
        <div className={styles.brandHeader}>
          <BorexLogo size="lg" />
          <div className={styles.badge}>
            <SunMedium size={14} /> Lighting the world, one ray at a time
          </div>
        </div>

        <div className={styles.intro}>
          <h2>Sign In</h2>
          <p>Access your solar load estimation projects and sizing calculations.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>ENGINEER / USER NAME</span>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Field Engineer"
            />
          </label>

          <label className={styles.field}>
            <span>EMAIL ADDRESS</span>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@borex.energy"
            />
          </label>

          <Button type="submit" className={styles.submitBtn}>
            <LogIn size={16} /> Sign In to Projects
          </Button>
        </form>

        <div className={styles.footerNote}>
          <Shield size={13} />
          <span>Local secure session · Quick access enabled</span>
        </div>
      </div>
    </main>
  );
};
