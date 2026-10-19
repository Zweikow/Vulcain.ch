import { redirect } from 'next/navigation'

export default function CodesPromoPage() {
  redirect('/admin/promotions?tab=codes')
}
