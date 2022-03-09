import React from "react";
import { Replicache } from "replicache";
import Header from "./header";
import MainSection from "./main-section";
import { M } from "./mutators";
//import MainSection from "../components/MainSection";

const App = ({ rep }: { rep: Replicache<M> }) => (
  <div>
    <Header rep={rep} />
    <MainSection rep={rep} />
  </div>
);

export default App;
