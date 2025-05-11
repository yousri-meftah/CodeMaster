import { Link } from "wouter";
import { Transition } from "@headlessui/react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { name: string; path: string }[];
  activeLink: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  links,
  activeLink,
}) => {
  const isActivePath = (path: string) => {
    if (path === "/" && activeLink === "/") return true;
    if (path !== "/" && activeLink.startsWith(path)) return true;
    return false;
  };

  return (
    <Transition
      show={isOpen}
      enter="transition duration-200 ease-out"
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave="transition duration-150 ease-in"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div className="md:hidden pb-4">
        <nav className="flex flex-col space-y-2">
          {links.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              onClick={onClose}
              className={`font-medium ${
                isActivePath(link.path)
                  ? "bg-muted text-primary"
                  : "hover:bg-muted"
              } px-3 py-2 rounded-md`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </Transition>
  );
};

export default MobileMenu;
