import React from "react";
import "./App.css";
import Main from "./components/Main";

function App() {
  return (
    <React.Suspense fallback={<div className="loadingDiv"></div>}>
      <Main />
    </React.Suspense>
  );
}

export default App;
