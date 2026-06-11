import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Toast({ text, onClose }) {
  return (
    <motion.button
      className="toast"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      onClick={onClose}
    >
      <Sparkles size={17} />
      {text}
    </motion.button>
  );
}
