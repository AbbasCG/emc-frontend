import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Tag, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { EmcButton } from '@/components/ui';

export default function Checkout() {
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const basePrice = 150;
  const discount = couponApplied ? 75 : 0;
  const finalPrice = basePrice - discount;

  const handleApplyCoupon = () => {
    if (!couponCode) return;
    setIsApplying(true);
    // Mock API call
    setTimeout(() => {
      setIsApplying(false);
      if (couponCode.toUpperCase() === 'WELCOME50') {
        setCouponApplied(true);
      } else {
        alert('Invalid coupon code');
      }
    }, 800);
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    // Mock API call
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center"
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-8">
            Your registration is confirmed. You will be automatically assigned to the best class based on your level.
          </p>
          <EmcButton size="lg" className="w-full">
            Go to My Dashboard
          </EmcButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="text-gray-600 mt-2">Secure your spot in the English Institute</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Details */}
          <div className="flex-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-primary-600" />
                Program Details
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Assigned Level</span>
                  <span className="font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">B1 Intermediate</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bundle</span>
                  <span className="font-semibold text-gray-900">1 Level (3 Months)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Preferred Schedule</span>
                  <span className="font-semibold text-gray-900">Evening Classes</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Tag className="w-6 h-6 mr-2 text-primary-600" />
                Have a coupon?
              </h2>
              <div className="flex space-x-3">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code (e.g., WELCOME50)"
                  className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  disabled={couponApplied || isProcessing}
                />
                <EmcButton 
                  onClick={handleApplyCoupon}
                  disabled={!couponCode || couponApplied || isApplying}
                  className="px-6 rounded-xl"
                >
                  {isApplying ? 'Applying...' : couponApplied ? 'Applied' : 'Apply'}
                </EmcButton>
              </div>
              {couponApplied && (
                <p className="text-green-600 text-sm mt-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Coupon applied successfully!
                </p>
              )}
            </motion.div>
          </div>

          {/* Right Column: Order Summary */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full md:w-96"
          >
            <div className="bg-white rounded-2xl shadow-xl border p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price</span>
                  <span className="font-medium text-gray-900">${basePrice.toFixed(2)}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <span>Discount applied</span>
                    <span className="font-medium">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-3xl font-extrabold text-primary-600">${finalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-500 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <p>Safe and secure checkout. We use SSL encryption to protect your payment details.</p>
              </div>

              <EmcButton 
                size="lg" 
                className="w-full h-14 text-lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay ${finalPrice.toFixed(2)}
                  </>
                )}
              </EmcButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
