import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { PageHeader, Card, Btn, Input, fmt, today } from '../../components/ui'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ startDate: '', endDate: '', category: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    date: today(),
    description: '',
    category: '',
    amount: '',
    payment_method: 'cash',
    notes: ''
  })

  useEffect(() => {
    console.log('📊 Expenses component mounted')
    console.log('🔍 Loading expenses with filters:', filters)
    loadExpenses()
    loadCategories()
  }, [filters])

  const loadExpenses = () => {
    console.log('📥 Calling api.expenses.getExpenses with:', filters)
    api.expenses.getExpenses(filters)
      .then(data => {
        console.log('✅ Expenses loaded:', data)
        setExpenses(data)
      })
      .catch(err => {
        console.error('❌ Error loading expenses:', err)
        setExpenses([])
      })
  }

  const loadCategories = () => {
    console.log('📥 Calling api.expenses.getCategories')
    api.expenses.getCategories()
      .then(data => {
        console.log('✅ Categories loaded:', data)
        setCategories(data)
      })
      .catch(err => {
        console.error('❌ Error loading categories:', err)
        setCategories([])
      })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (editingId) {
      await api.expenses.updateExpense({ ...form, id: editingId })
    } else {
      await api.expenses.createExpense(form)
    }
    
    resetForm()
    loadExpenses()
    loadCategories()
  }

  const handleEdit = (expense) => {
    setForm(expense)
    setEditingId(expense.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this expense?')) {
      await api.expenses.deleteExpense(id)
      loadExpenses()
    }
  }

  const resetForm = () => {
    setForm({ date: today(), description: '', category: '', amount: '', payment_method: 'cash', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader title="Expenses Management" subtitle="Track daily operational expenses" />
      <div className="p-5 space-y-5 flex-1 overflow-auto">

      {/* Filters & Add Button */}
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-3">
          <Input label="Start Date" type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          <Input label="End Date" type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          <div>
            <label className="block text-[11px] font-bold text-[#434653] uppercase mb-1">Category</label>
            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full px-3 py-1.5 border border-[#c3c6d5] rounded text-[13px]">
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Btn onClick={() => setShowForm(!showForm)} className="w-full">
              <span className="material-symbols-outlined text-[16px]">add</span>
              {showForm ? 'Cancel' : 'Add Expense'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-5">
          <h3 className="text-[14px] font-bold text-[#003c90] mb-4">{editingId ? 'Edit' : 'Add'} Expense</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            <Input label="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Rent, Salary, Utilities..." required />
            <Input label="Category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Operational, Staff..." list="categories" />
            <datalist id="categories">
              {categories.map(cat => <option key={cat} value={cat} />)}
            </datalist>
            <Input label="Amount (PKR)" type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
            <div>
              <label className="block text-[11px] font-bold text-[#434653] uppercase mb-1">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full px-3 py-1.5 border border-[#c3c6d5] rounded text-[13px]">
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
            <Input label="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes..." />
            <div className="col-span-3 flex gap-2">
              <Btn type="submit">{editingId ? 'Update' : 'Save'} Expense</Btn>
              {editingId && <Btn type="button" variant="outline" onClick={resetForm}>Cancel</Btn>}
            </div>
          </form>
        </Card>
      )}

      {/* Summary */}
      <Card className="p-4 bg-[#003c90]/5">
        <div className="flex justify-between items-center">
          <span className="text-[#003c90] font-bold">Total Expenses</span>
          <span className="text-[#003c90] font-bold text-[18px]">PKR {fmt(totalExpenses)}</span>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f2f4f6] border-b-2 border-[#003c90]">
              <tr>
                {['Date','Description','Category','Amount','Payment','Notes','Actions'].map(h => 
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#434653] uppercase">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0]">
              {expenses.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-[#737784]">No expenses found</td></tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#f7f9fb]">
                    <td className="px-4 py-3 text-[13px]">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[13px] font-medium">{exp.description}</td>
                    <td className="px-4 py-3 text-[12px] text-[#737784]">{exp.category || '-'}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-red-600">PKR {fmt(exp.amount)}</td>
                    <td className="px-4 py-3 text-[12px]">{exp.payment_method}</td>
                    <td className="px-4 py-3 text-[12px] text-[#737784]">{exp.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(exp)} className="text-[#003c90] hover:text-[#002266]">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(exp.id)} className="text-red-600 hover:text-red-800">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
    </div>
  )
}
