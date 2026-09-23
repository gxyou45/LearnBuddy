import {createContext,useContext,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

// The action row is a sibling of the scrolling lesson, so it never covers content.
export const LearningActionsContext=createContext<HTMLElement|null>(null);
export function LearningActions({children}:{children:ReactNode}) {
 const host=useContext(LearningActionsContext);
 return host?createPortal(<div className="learning-actions">{children}</div>,host):null;
}
