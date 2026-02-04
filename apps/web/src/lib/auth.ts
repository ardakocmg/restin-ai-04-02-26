import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@antigravity/database"
import bcrypt from "bcryptjs"

async function getUser(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true }
        });
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user.");
    }
}

async function getUserByPin(pin: string, organizationId: string) {
    // POS "Fast Switch" Mode
    // Finds user by PIN within the Organization Context
    // Note: In real prod, PINs should be hashed.
    try {
        const user = await prisma.user.findFirst({
            where: {
                organizationId,
                pin // direct check for Bedrock, use hash in Prod
            },
            include: { organization: true }
        });
        return user;
    } catch (error) {
        return null;
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                // Inject Role & Tenant for Client Side
                session.user.role = token.role;
                session.user.organizationId = token.organizationId;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                // token.role = user.role; // Add to Type Augmentation
                // token.organizationId = user.organizationId;
            }
            return token;
        }
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                pin: { label: "PIN", type: "text" }, // For POS
                organizationId: { label: "Org ID", type: "text" } // For POS context
            },
            async authorize(credentials) {

                // Mode A: POS PIN Login
                if (credentials.pin && credentials.organizationId) {
                    const user = await getUserByPin(credentials.pin as string, credentials.organizationId as string);
                    if (user) return user;
                    return null;
                }

                // Mode B: Web Admin Login
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(4) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.hashedPassword || "");
                    if (passwordsMatch) return user;
                }

                console.log("Invalid credentials");
                return null;
            },
        }),
    ],
});
