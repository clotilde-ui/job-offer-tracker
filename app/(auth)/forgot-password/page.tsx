import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-beige">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center text-brand-dark">Mot de passe oublié</h1>
        <p className="text-sm text-brand-dark/80 text-center">
          Pour réinitialiser votre mot de passe, contactez un administrateur de votre espace.
        </p>
        <Link
          href="/login"
          className="block text-center text-sm text-brand-dark underline underline-offset-2 hover:opacity-80"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
