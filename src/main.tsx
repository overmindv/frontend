import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { apolloClient } from "./api/client";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/index.css";

const router = createBrowserRouter([{
  path: "*",
  element: <ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider>,
}], { future: { v7_relativeSplatPath: true } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </ApolloProvider>
  </React.StrictMode>,
);
