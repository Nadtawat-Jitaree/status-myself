import Link from "next/link";
import { Button } from "./ui/button";

export function NavbarLeft() {
  return (
    <>
    <Link href={"/"} className="mr-4">Home</Link>
    <Link href={"/status-myself/notes"} className="mr-4">Notes</Link>
    </>
  );
}
