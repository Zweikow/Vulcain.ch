import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        })

        // Always run bcrypt to prevent timing-based username enumeration
        const DUMMY_HASH = '$2b$12$dummyhashfortimingXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        const valid = await bcrypt.compare(parsed.data.password, user?.password ?? DUMMY_HASH)
        if (!user || !valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
