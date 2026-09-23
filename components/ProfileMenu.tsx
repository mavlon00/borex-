import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Mail } from 'lucide-react';
import { UserSession } from '../helpers/storage';
import styles from './ProfileMenu.module.css';

interface ProfileMenuProps {
  userSession: UserSession;
  onSignOut: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ userSession, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = getInitials(userSession.name);

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.avatar}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="User profile"
        title={userSession.name}
      >
        <span className={styles.initials}>{initials}</span>
        <span className={styles.statusDot} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userCard}>
            <div className={styles.avatarLarge}>
              <span>{initials}</span>
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                <User size={13} />
                <span>{userSession.name}</span>
              </div>
              <div className={styles.userEmail}>
                <Mail size={12} />
                <span>{userSession.email}</span>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          <button
            className={styles.signOutBtn}
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
