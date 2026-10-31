import { createContext, useContext } from "react";

// Layout puts an empty <nav> in the header and shares it here; Tabs renders its desktop section
// links into it, so the page sections live in the navigation bar instead of under the title.
export const NavSlotContext = createContext(null);
export const useNavSlot = () => useContext(NavSlotContext);
