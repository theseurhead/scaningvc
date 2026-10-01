import { createClient } from '@/lib/supabase/server'
import { logout } from './login/actions'
import { LogoutButton } from './LogoutButton'
import Link from 'next/link'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase.from('profiles').select('role, username').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // Fetch all batches for the user to calculate grand totals
  const { data: batches } = await supabase
    .from('batches')
    .select('angka_mulai, angka_selesai, scans(count)')
    .eq('user_id', user.id);

  let grandTotal = 0;
  let totalScanned = 0;
  if (batches) {
    for (const b of batches) {
      grandTotal += (b.angka_selesai - b.angka_mulai + 1);
      totalScanned += b.scans?.[0]?.count || 0;
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 flex justify-between items-center shadow-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
          <span>{profile?.username || user.email?.split('@')[0]}</span>
          {isAdmin && (
            <Link href="/admin" className="text-red-600 hover:text-red-800 font-bold bg-red-50 px-3 py-1 rounded-full text-xs">
              Admin Panel
            </Link>
          )}
        </div>
        {!isAdmin && (
          <div className="text-[10px] text-gray-500 font-medium mt-0.5">
            Total QR: {grandTotal} &bull; Sudah scan: {totalScanned}
          </div>
        )}
      </div>
      <LogoutButton />
    </header>
  )
}
