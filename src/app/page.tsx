// src/app/page.tsx
import { prisma } from '@/lib/prisma'
import PostCard from '@/components/PostCard'

export default async function Home() {
  const posts = await prisma.post.findMany()

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Latest Posts</h1>
      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  )
}
