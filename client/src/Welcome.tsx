import { useState } from "react";
import { NAME_MAX } from "@kabza/shared";
import type { User } from "@kabza/shared";
import { rename } from "./socket";

export function Welcome({ me, onClose }: { me: User; onClose: () => void }) {
  const [name, setName] = useState(me.name);

  const start = () => {
    if (name.trim() && name.trim() !== me.name) rename(name);
    onClose();
  };

  return (
    <div className="overlay welcome" onClick={start}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <h2>welcome to kabza</h2>
        <ul className="howto">
          <li>click any white square, it becomes yours</li>
          <li>everyone sees it instantly, so does your rival</li>
          <li>board fills up, winner is crowned, fresh board</li>
        </ul>
        <div className="join">
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
          />
          <button onClick={start}>let's go</button>
        </div>
        <p className="fineprint">no signup, the name is just for the leaderboard</p>
      </div>
    </div>
  );
}
