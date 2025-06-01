// src/app/api/posts/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse , NextRequest } from 'next/server'

export async function GET() {
  const posts = await prisma.post.findMany()
  return NextResponse.json(posts)
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || !body.title || !body.content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}