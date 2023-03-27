import {OpenStreetMapProvider} from "leaflet-geosearch";
import {useState} from "react";
import {SearchResult} from "leaflet-geosearch/lib/providers/provider";
import {RawResult} from "leaflet-geosearch/lib/providers/openStreetMapProvider";
import {Box} from "@chakra-ui/react";

const SearchBox = () => {
    const provider = new OpenStreetMapProvider();
    const [results, setResults] = useState<SearchResult<RawResult>[]>([])
    const [text, setText] = useState<string>('enter something')

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault()
        const results = await provider.search({ query: text });
        setResults(results)
    }
    return (
        <Box zIndex={1000}>
            <form onSubmit={handleSubmit}>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)}/>
            </form>
            <div>
                {results.map((item) => (<p>{item.label}</p>))}
            </div>
        </Box>
    )
}

export default SearchBox;