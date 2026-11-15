import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
const node=document.getElementById('root');if(!node)throw new Error('ABB map root missing');
createRoot(node).render(<React.StrictMode><App/></React.StrictMode>);
