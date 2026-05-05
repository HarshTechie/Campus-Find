import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { GoogleOAuthProvider } from "@react-oauth/google";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <h1 style={{ color: "white" }}>TEST UI</h1>
    <GoogleOAuthProvider clientId="746247874618-4f3emnrmkkre60ttgn4h53h28nsp05po.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);