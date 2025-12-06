import { BackButton } from './BackButton'

interface PageHeaderProps {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto max-w-4xl px-4 h-14 flex items-center gap-4">
        <BackButton label="" className="p-2 -ml-2" />
        <h1 className="font-semibold text-foreground truncate">{title}</h1>
      </div>
    </header>
  )
}
