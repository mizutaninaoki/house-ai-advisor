import { HeartIcon } from '@heroicons/react/24/outline';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-cyan-700 to-blue-700 text-white py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center items-center mb-3">
          <HeartIcon className="h-5 w-5 text-pink-300 mr-2" />
          <p className="text-sm font-medium">家族の未来をつなぐ</p>
        </div>
        <p className="text-sm">&copy; {new Date().getFullYear()} おうちのAI相談室. All rights reserved.</p>
        <p className="text-xs mt-2 text-blue-200">
          「揉めず・後腐れなく」遺産分割をサポート
        </p>
      </div>
    </footer>
  );
} 
