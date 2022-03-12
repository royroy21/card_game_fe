import {Route, Routes} from "react-router-dom";
import App from "./App";
import JoinGame from "./components/ui/joinGame";
import Game from "./components/game";
import GameContainer from "./components/game/Container";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/game" element={<GameContainer />} />
      <Route path="/join-game" element={<JoinGame />} />
    </Routes>
  )
}

export default AppRoutes;
