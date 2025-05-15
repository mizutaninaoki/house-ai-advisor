import Link from 'next/link';
import { UserCircleIcon, HomeIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  userName?: string;
  isLoggedIn: boolean;
}

export default function Header({ userName, isLoggedIn }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold flex items-center">
          <SparklesIcon className="h-6 w-6 mr-2" />
          おうちのAI相談室
        </Link>
        
        <div className="flex items-center">
          {isLoggedIn ? (
            <div className="flex items-center">
              <UserCircleIcon className="h-6 w-6 mr-2" />
              <span className="mr-4">{userName || 'ユーザー'}</span>
              <Link 
                href="/auth/signout" 
                className="bg-white text-cyan-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 transition-all duration-300 shadow-sm"
              >
                ログアウト
              </Link>
            </div>
          ) : (
            <Link 
              href="/auth/signin" 
              className="bg-white text-cyan-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 transition-all duration-300 shadow-sm"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 
