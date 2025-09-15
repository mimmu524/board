import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function WritePost() {
  const [form, setForm] = useState({ title: "", content: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인 후 글을 작성할 수 있습니다.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/posts", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm({ title: "", content: "" });
      navigate("/posts");
    } catch (err) {
      alert(err.response?.data?.error || `글 작성 실패 ${err}`);
    }
  };

  return (
    <div>
      <h1>글 작성</h1>
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
        <button type="submit">작성</button>
      </form>
    </div>
  );
}

export default WritePost;
