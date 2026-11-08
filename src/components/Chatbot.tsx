import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  text: string;
  isBot: boolean;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = getBotResponse(input);
      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    }, 1000);
  };

  const getBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('price') || input.includes('cost')) {
      return "Our pricing varies depending on the specific requirements of your project. Please visit our contact page to request a detailed quote.";
    }
    if (input.includes('delivery') || input.includes('shipping')) {
      return "We offer delivery services within the city. Delivery time and costs depend on your location. Please provide your details for a specific estimate.";
    }
    if (input.includes('contact') || input.includes('reach')) {
      return "You can reach us through our contact form, email at info@nexacraft.co.ke, or call us at +254 795 333 004.";
    }
    return "Thank you for your message. How else can I assist you with our design, printing, or branding services?";
  };

  return (
    <div className="fixed left-6 bottom-6 z-50">
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl w-80 mb-4 transition-all duration-300">
          <div className="bg-primary-700 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">Chat with us</h3>
            <button onClick={toggleChat} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-96 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isBot
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-primary-700 text-white'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSend} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
              <button
                type="submit"
                className="bg-primary-700 text-white p-2 rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
      
      <button
        onClick={toggleChat}
        className="bg-primary-700 text-white p-4 rounded-full shadow-lg hover:bg-primary-800 transition-colors"
        aria-label="Toggle chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Chatbot;