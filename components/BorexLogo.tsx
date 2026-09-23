import React from 'react';
import borexLogo from '../borex-Asset1.png';
import styles from './BorexLogo.module.css';

interface BorexLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BorexLogo: React.FC<BorexLogoProps> = ({
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <img src={borexLogo} alt="BoreX" className={styles.logoImg} />
    </div>
  );
};
