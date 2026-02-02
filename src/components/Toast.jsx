import { CheckIcon } from './Icons';

function Toast({ show, message }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-xl transform transition-all duration-300 z-50 flex items-center gap-2 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <CheckIcon className="w-5 h-5 text-green-400" />
      <span>{message}</span>
    </div>
  );
}

export default Toast;
