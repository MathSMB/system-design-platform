import { redirect } from "next/navigation";

/** Endereço antigo: os treinos guiados viraram Estudo. */
export default function Treinos() {
  redirect("/estudo/system-design");
}
