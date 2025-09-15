import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function PostList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/posts").then((res) => setPosts(res.data));
  }, []);

  return (
    <div className="container-fluid">
      <h2 className="mb-3">게시글 목록</h2>
      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: "50%" }}>제목</th>
              <th style={{ width: "15%" }}>작성자</th>
              <th style={{ width: "10%" }}>추천</th>
              <th style={{ width: "25%" }}>작성일</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <Link
                    to={`/posts/${post.id}`}
                    className="text-decoration-none text-dark fw-semibold"
                  >
                    {post.title}
                  </Link>
                </td>
                <td>{post.username}</td>
                <td>
                  <span className="badge bg-primary rounded-pill">
                    👍 {post.like_count || 0}
                  </span>
                </td>
                <td>{new Date(post.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PostList;
