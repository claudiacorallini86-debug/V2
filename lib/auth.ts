import { blink } from './blink'
import { hashPassword, verifyPassword, generateId } from './crypto'

export interface AmelieUser {
  id: string
  email: string
  displayName: string | null
  role: 'admin' | 'staff'
  active: number
}

export interface LoginResult {
  success: boolean
  user?: AmelieUser
  error?: string
}

export async function loginUser(emailInput: string, password: string): Promise<LoginResult> {
  try {
    console.log('AUTH_VERSION: 4 (Debug-Assets)');
    const db = blink.db as any
    // Normalizza l'email
    const emailToSearch = emailInput.trim().toLowerCase();
    
    console.log('loginUser: Searching for email:', emailToSearch);

    // Verifica configurazione SDK
    if (!blink || !db) {
      console.error('loginUser: Blink SDK not initialized');
      return { success: false, error: 'Errore di configurazione sistema.' };
    }

    // Bypassa il bug della doppia codifica dell'SDK: 
    // scarica gli utenti e filtra in memoria per sicurezza
    let allUsers: any[] = [];
    try {
      allUsers = await db.amelieUser.list() as any[];
      console.log('loginUser: Database fetch success, total users:', allUsers.length);
      if (allUsers.length > 0) {
        console.log('loginUser: First user email snippet:', (allUsers[0].email || '').substring(0, 5) + '...');
      }
    } catch (fetchErr: any) {
      console.error('loginUser: Database fetch failed:', fetchErr);
      return { success: false, error: 'Errore durante il recupero dei dati utenti.' };
    }
    
    if (!allUsers || allUsers.length === 0) {
      console.log('loginUser: No users found in database');
      return { success: false, error: 'Sistema non inizializzato.' };
    }

    const rows = allUsers.filter(u => (u.email || '').toLowerCase() === emailToSearch);

    if (rows.length === 0) {
      console.log('loginUser: No user found for email:', emailToSearch);
      return { success: false, error: 'Email o password non corretti.' };
    }

    const row = rows[0]
    const isActive = row.active === 1 || row.active === '1' || row.active === true;
    
    console.log('loginUser: User found:', { id: row.id, role: row.role, active: row.active, isActive })

    if (!isActive) {
      console.log('loginUser: User is inactive')
      return { success: false, error: 'Account disabilitato. Contatta un amministratore.' }
    }

    const storedHash = row.passwordHash || row.password_hash
    const valid = await verifyPassword(password, storedHash)
    
    if (!valid) {
      const computedHash = await hashPassword(password)
      console.log('loginUser: Password mismatch', { 
        stored: storedHash, 
        computed: computedHash 
      })
      return { success: false, error: 'Email o password non corretti.' }
    }

    console.log('loginUser: Success')
    return {
      success: true,
      user: {
        id: row.id,
        email: row.email,
        displayName: row.displayName || row.display_name,
        role: row.role,
        active: Number(row.active),
      },
    }
  } catch (err: any) {
    console.error('loginUser error:', err)
    return { success: false, error: 'Errore di connessione. Riprova.' }
  }
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: 'admin' | 'staff' = 'staff'
): Promise<{ success: boolean; user?: AmelieUser; error?: string }> {
  try {
    const db = blink.db as any
    const emailToSearch = email.trim().toLowerCase();
    
    // Filtro locale per evitare bug di encoding
    const allUsers = await db.amelieUser.list() as any[];
    const existing = allUsers.filter(u => u.email.toLowerCase() === emailToSearch);
    
    if (existing && existing.length > 0) {
      return { success: false, error: 'Email già registrata.' }
    }

    const id = generateId()
    const passwordHash = await hashPassword(password)

    await db.amelieUser.create({
      id,
      email,
      passwordHash,
      displayName,
      role,
      active: 1,
    } as any)

    return {
      success: true,
      user: { id, email, displayName, role, active: 1 },
    }
  } catch (err: any) {
    console.error('registerUser error:', err)
    return { success: false, error: 'Errore durante la registrazione.' }
  }
}

/**
 * Inizializza l'utente admin se non esiste.
 * Utile per il primo avvio in produzione.
 */
export async function initializeAdmin(): Promise<void> {
  try {
    const db = blink.db as any
    const email = 'admin@amelie.it'
    const password = 'admin123'
    
    // Verifica se la tabella utenti esiste e se l'admin è presente
    const allUsers = await db.amelieUser.list() as any[]
    const exists = allUsers.some(u => (u.email || '').toLowerCase() === email.toLowerCase())
    
    if (!exists) {
      console.log('initializeAdmin: Admin not found, creating...')
      await registerUser(email, password, 'Amministratore', 'admin')
      console.log('initializeAdmin: Admin created successfully')
    } else {
      console.log('initializeAdmin: Admin already exists')
    }
  } catch (err) {
    console.error('initializeAdmin error:', err)
  }
}