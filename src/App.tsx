import { Board } from "./components/Board";
import { initialBoard } from "./data/mockData";

function App() {
  return <Board initialBoard={initialBoard} />;
}

export default App;
