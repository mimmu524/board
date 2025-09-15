// App.js
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import PostList from "./PostList";
import PostDetail from "./PostDetail";
import WritePost from "./WritePost";
import Register from "./Register";
import Login from "./Login";
import Logout from "./Logout";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <Router>
      <div className="container-fluid p-3">
        {" "}
        {/* 화면 꽉차게 */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4 border-bottom">
          <div className="container-fluid">
            <Link className="navbar-brand fw-bold text-primary" to="/posts">
              MyBoard
            </Link>

            <div className="d-flex">
              {!isLoggedIn && (
                <>
                  <Link className="btn btn-primary me-2" to="/register">
                    회원가입
                  </Link>
                  <Link className="btn btn-outline-primary" to="/login">
                    로그인
                  </Link>
                </>
              )}
              {isLoggedIn && (
                <>
                  <Link className="btn btn-outline-primary me-2" to="/write">
                    글 작성
                  </Link>
                  <Link className="btn btn-outline-primary" to="/logout">
                    로그아웃
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/posts" element={<PostList />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/write" element={<WritePost />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/login"
            element={<Login setIsLoggedIn={setIsLoggedIn} />}
          />
          <Route
            path="/logout"
            element={<Logout setIsLoggedIn={setIsLoggedIn} />}
          />
          <Route path="*" element={<PostList />} />
        </Routes>
      </div>
    </Router>
  );
}
