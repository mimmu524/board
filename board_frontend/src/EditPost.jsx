import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 기존 게시물 데이터 불러오기
    const fetchPost = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/posts/${id}`);
        const post = response.data;
        setForm({
          title: post.title,
          content: post.content,
        });
        setLoading(false);
      } catch (error) {
        console.error("게시물 불러오기 오류:", error);
        alert("게시물을 불러올 수 없습니다.");
        navigate("/posts");
      }
    };

    fetchPost();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인 후 수정할 수 있습니다.");
      return;
    }

    try {
      await axios.put(`http://localhost:5000/posts/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("수정 완료!");
      navigate(`/posts/${id}`);
    } catch (err) {
      console.error("수정 오류:", err);
      if (err.response?.status === 401) {
        alert("로그인이 필요합니다.");
      } else if (err.response?.status === 403) {
        alert("수정 권한이 없습니다.");
      } else {
        alert(err.response?.data?.error || "수정 실패");
      }
    }
  };

  if (loading) {
    return <div>로딩중...</div>;
  }

  return (
    <div>
      <h1>글 수정</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          type="text"
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          placeholder="내용"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={5}
          required
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit">수정 완료</button>
          <button type="button" onClick={() => navigate(`/posts/${id}`)}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditPost;
