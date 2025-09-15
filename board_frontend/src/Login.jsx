import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login({ setIsLoggedIn }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/login", form);

      // 성공 시
      localStorage.setItem("token", res.data.token);
      setIsLoggedIn(true);
      alert("로그인 성공!");
      window.location.href = "/posts";
    } catch (err) {
      // 실패 시
      alert(err.response?.data?.error || "로그인 실패");
      // window.location.href = "/posts";
    }
  };

  return (
    <div>
      <h1>로그인</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button type="submit">로그인</button>
      </form>
    </div>
  );
}

export default Login;
