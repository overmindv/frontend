import { ApolloProvider } from "@apollo/client";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { apolloClient } from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

function PublicPage() {
 const auth = useAuth();
 return <p>{auth.isLoading ? "Загрузка сессии" : "Публичный план доступен"}</p>;
}
afterEach(async () => { await apolloClient.clearStore(); vi.unstubAllGlobals(); });
test("отсутствующая сессия не отправляет гостя с публичного плана на вход", async () => {
 vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: [{message:"Unauthenticated",extensions:{code:"UNAUTHENTICATED"}}] }), {status:200,headers:{"content-type":"application/json"}})));
 render(<ApolloProvider client={apolloClient}><MemoryRouter initialEntries={["/plans/public"]}><AuthProvider><Routes>
  <Route path="/plans/public" element={<PublicPage />} /><Route path="/login" element={<p>Принудительный вход</p>} />
 </Routes></AuthProvider></MemoryRouter></ApolloProvider>);
 expect(await screen.findByText("Публичный план доступен")).toBeInTheDocument();
 expect(screen.queryByText("Принудительный вход")).not.toBeInTheDocument();
});

test("выход не открывает форму входа до удаления серверной cookie", async () => {
 let logoutCalls = 0;
 let finishLogout: (() => void) | undefined;
 vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
  const body=JSON.parse(init.body);
  if(body.query.includes("mutation Logout")) { logoutCalls++; await new Promise<void>(resolve=>{finishLogout=resolve;}); }
  return new Response(JSON.stringify({data:body.query.includes("mutation Logout")?{logout:true}:{me:{id:"owner",isAdmin:false,isSuperuser:false}}}),{status:200,headers:{"content-type":"application/json"}});
 }));
 function Session(){const auth=useAuth();return auth.isAuthenticated?<button onClick={auth.logout}>Выйти</button>:<p>Проверка сессии</p>;}
 render(<ApolloProvider client={apolloClient}><MemoryRouter initialEntries={["/profile"]}><AuthProvider><Routes><Route path="/profile" element={<Session/>}/><Route path="/login" element={<p>Форма входа</p>}/></Routes></AuthProvider></MemoryRouter></ApolloProvider>);
 const {default:userEvent}=await import("@testing-library/user-event");
 await userEvent.setup().click(await screen.findByRole("button",{name:"Выйти"}));
 expect(screen.queryByText("Форма входа")).not.toBeInTheDocument();
 await userEvent.setup().click(screen.getByRole("button",{name:"Выйти"}));
 expect(logoutCalls).toBe(1);
 expect(finishLogout).toBeDefined();finishLogout!();
 expect(await screen.findByText("Форма входа")).toBeInTheDocument();
});
