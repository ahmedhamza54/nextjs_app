type Post = {
  id: string
  title: string
  content: string
 
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <div className="border p-4 rounded shadow">
      <h2 className="text-xl font-semibold">{post.title}</h2>
      <p className="text-gray-600">{post.content}</p>
     
    </div>
  )
}
