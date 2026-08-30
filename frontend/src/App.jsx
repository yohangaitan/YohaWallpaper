
import { useState } from 'react'
import Navbar      from './components/Navbar'
import CategoryBar from './components/CategoryBar'
import Footer      from './components/Footer'
import Home        from './pages/Home'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sort,        setSort]        = useState('default')
  const [category,    setCategory]    = useState(null)

  const handleSearch = (q) => {
    setSearchQuery(q)
    if (q) setCategory(null)  // Limpiar categoría al buscar
  }

  const handleSort = (value) => {
    setSort(value)
    setCategory(null)
  }

  return (
    <div className="min-h-screen bg-surface-900 font-sans flex flex-col">
      <Navbar
        onSearch={handleSearch}
        onSort={handleSort}
        activeSort={sort}
        searchQuery={searchQuery}
      />
      <CategoryBar activeCategory={category} onSelect={setCategory} />
      <div className="flex-1">
        <Home
          searchQuery={searchQuery}
          sort={sort}
          categoryId={category?.id ?? null}
          categoryName={category?.name ?? null}
          onSearch={handleSearch}
        />
      </div>
      <Footer />
    </div>
  )
}
