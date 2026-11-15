'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Champ texte avec liste de suggestions, selon le motif « combobox » de
 * l'ARIA 1.2 (liste, sans complétion dans le champ) :
 * - flèches bas et haut : ouvrir la liste et la parcourir ;
 * - Entrée : choisir la suggestion active (sans suggestion active, Entrée
 *   garde son rôle et envoie le formulaire) ;
 * - Échap : fermer la liste ; Tab ou un clic ailleurs aussi ;
 * - souris et toucher : un appui sur une suggestion la choisit, sans faire
 *   perdre le focus au champ ; la liste défile au doigt.
 *
 * Les suggestions n'imposent rien : la valeur reste celle que la personne tape.
 */
export interface ComboboxProps<T> extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onSelect' | 'role' | 'type'
> {
  value: string
  onValueChange: (value: string) => void
  options: readonly T[]
  onOptionSelect: (option: T) => void
  getOptionKey: (option: T) => string
  renderOption: (option: T) => ReactNode
  /** Nom de la liste pour les lecteurs d'écran, ex. « Localités du NPA ». */
  listLabel: string
  listClassName?: string
}

export function Combobox<T>({
  value,
  onValueChange,
  options,
  onOptionSelect,
  getOptionKey,
  renderOption,
  listLabel,
  className,
  listClassName,
  id,
  onKeyDown,
  onBlur,
  ...inputProps
}: ComboboxProps<T>) {
  const autoId = useId()
  const inputId = id ?? `${autoId}-champ`
  const listId = `${autoId}-liste`
  const optionId = (i: number) => `${autoId}-option-${i}`

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)
  const expanded = open && options.length > 0

  // Nouvelle liste : rien de présélectionné, pour qu'Entrée ne choisisse pas à
  // la place de la personne.
  const signature = options.map(getOptionKey).join('|')
  useEffect(() => {
    setActive(-1)
  }, [signature])

  useEffect(() => {
    if (!expanded || active < 0) return
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [active, expanded])

  const close = () => {
    setOpen(false)
    setActive(-1)
  }

  const choose = (option: T) => {
    onOptionSelect(option)
    close()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const count = options.length

    switch (e.key) {
      case 'ArrowDown':
        if (count === 0) return
        e.preventDefault()
        if (!expanded) {
          setOpen(true)
          setActive(0)
        } else {
          setActive((i) => (i + 1) % count)
        }
        break
      case 'ArrowUp':
        if (count === 0) return
        e.preventDefault()
        if (!expanded) {
          setOpen(true)
          setActive(count - 1)
        } else {
          setActive((i) => (i <= 0 ? count - 1 : i - 1))
        }
        break
      case 'Enter':
        if (expanded && active >= 0 && active < count) {
          e.preventDefault()
          choose(options[active])
        }
        break
      case 'Escape':
        if (expanded) {
          e.preventDefault()
          e.stopPropagation()
          close()
        }
        break
      case 'Tab':
        close()
        break
    }
  }

  return (
    <div className="relative">
      <input
        {...inputProps}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        className={className}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          onBlur?.(e)
          close()
        }}
      />

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={listLabel}
        hidden={!expanded}
        className={cn(
          'absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[15rem] overflow-y-auto overscroll-contain rounded-[10px] border border-border bg-popover py-1 text-popover-foreground shadow-[0_1px_3px_rgba(21,50,67,0.06)]',
          listClassName
        )}
      >
        {expanded &&
          options.map((option, i) => (
            <li
              key={getOptionKey(option)}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // Empêche le champ de perdre le focus avant le clic ou l'appui.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
              className={cn(
                'flex min-h-11 cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm sm:min-h-9',
                i === active && 'bg-muted'
              )}
            >
              {renderOption(option)}
            </li>
          ))}
      </ul>

      {/* Annonce du nombre de suggestions pour les lecteurs d'écran. */}
      <span className="sr-only" aria-live="polite">
        {expanded
          ? `${options.length} suggestion${options.length > 1 ? 's' : ''}, flèches haut et bas pour parcourir, Entrée pour choisir.`
          : ''}
      </span>
    </div>
  )
}
