import React from 'react'

export interface IconProps {
  className?: string
  size?: number
}

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/**
 * Tableau de bord : Vue analytique avec 4 panneaux modulaires
 */
export function DashboardIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

/**
 * Préparation : Carton d'expédition / colis avec rabats
 */
export function PreparationIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
      <line x1="7.5" y1="4.5" x2="16.5" y2="9.5" />
    </svg>
  )
}

/**
 * Commandes : Reçu / bordereau de commande avec encoches et lignes de facturation
 */
export function CommandesIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  )
}

/**
 * Factures : Document officiel A4 avec pliure, lignes de montant et sceau de paiement
 */
export function FacturesIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
      <circle cx="15.5" cy="17.5" r="2.5" />
    </svg>
  )
}

/**
 * Clients : Répertoire de contacts / badge client
 */
export function ClientsIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M16 2v2" />
      <path d="M8 2v2" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 18a5 5 0 0 1 10 0" />
    </svg>
  )
}

/**
 * Produits : Pomme artisanale élégante (Cidrerie du Vulcain)
 */
export function ProduitsIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <path d="M10 2c1 .5 2 2 2 5" />
    </svg>
  )
}

/**
 * Variante Bouteille : Bouteille artisanale de cidre / poiré
 */
export function BottleIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M10 2h4" />
      <path d="M11 2v3c0 1.5-3 3-3 6v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-9c0-3-3-4.5-3-6V2" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

/**
 * Catégories : Dossier avec onglet classeur
 */
export function CategoriesIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M2 10h20" />
    </svg>
  )
}

/**
 * Utilisateurs : Équipe / collaborateurs avec rôles
 */
export function UtilisateursIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

/**
 * Journal : Registre / parchemin d'audit et historique d'activités
 */
export function JournalIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M15 8h-5" />
      <path d="M15 12h-5" />
    </svg>
  )
}

/**
 * Paramètres : Rouage mécanique de précision
 */
export function ParametresIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * Utilisateur / Profil
 */
export function UserIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/**
 * Mode Clair (Soleil radieux)
 */
export function SunIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

/**
 * Mode Sombre (Croissant de lune)
 */
export function MoonIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

/**
 * Déconnexion : Porte de sortie avec flèche d'échappement
 */
export function LogoutIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

/**
 * KPI - Chiffre d'affaires : Sacoche monétaire / Coffre
 */
export function RevenueIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

/**
 * KPI - Marge brute : Courbe de croissance vers le haut
 */
export function MarginIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

/**
 * Offres & Promotions : Étiquette de remise avec découpe
 */
export function PromoIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} {...baseProps}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

/**
 * Pictogramme Pack / Carton de bouteilles avec compteur
 */
export function PackBadgeIcon({ count = 6, className = '' }: IconProps & { count?: number }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center w-7 h-7 shrink-0 ${className}`}
      style={{ width: '28px', height: '28px' }}
    >
      <svg
        style={{ width: '22px', height: '22px' }}
        className="w-[22px] h-[22px] text-current"
        {...baseProps}
      >
        <path d="M5 9h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" />
        <path d="M7 9V5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v4" />
        <path d="M13.5 9V5a1 1 0 0 1 1-1H16a1 1 0 0 1 1 1v4" />
        <line x1="5" y1="14" x2="19" y2="14" />
      </svg>
      <span className="absolute -top-1 -right-1 bg-primary text-text-on-primary text-[10px] font-bold font-mono px-1 rounded-full leading-tight border border-bg-card dark:border-bg-card-dark shadow-sm">
        {count}
      </span>
    </div>
  )
}
