import React, { useState, useEffect } from 'react';
import { Building2, Plus, Mail, Phone } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/suppliers?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-gray-900">Suppliers</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            Add Supplier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{supplier.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{supplier.code || 'No code'}</p>
                
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Mail className="w-4 h-4" />
                    {supplier.email}
                  </div>
                )}
                
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {supplier.phone}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Lead Time:</span>
                    <span className="font-medium">{supplier.lead_time_days} days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium">{supplier.payment_terms}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {suppliers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No suppliers added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Suppliers;
