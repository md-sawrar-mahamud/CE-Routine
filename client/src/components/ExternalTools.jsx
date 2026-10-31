import { motion } from 'framer-motion';

export default function ExternalTools() {
  const url = 'https://eccovers.netlify.app/';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <motion.a
        whileTap={{ scale: 0.97 }}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-pink-900 text-white p-4 rounded-lg text-center hover:opacity-90 font-medium"
      >
        📄 Create Cover
      </motion.a>
      <motion.a
        whileTap={{ scale: 0.97 }}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-orange-500 text-white p-4 rounded-lg text-center hover:opacity-90 font-medium"
      >
        📑 Create Index
      </motion.a>
    </div>
  );
}