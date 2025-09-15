import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Logout({ setIsLoggedIn }) {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("token"); // 토큰 삭제
    localStorage.removeItem("username");
    setIsLoggedIn(false); // 상태 갱신
    navigate("/posts"); // 로그인 페이지로 이동
  }, [navigate, setIsLoggedIn]);

  return null;
}

export default Logout;
