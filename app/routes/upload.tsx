import { useState, type FormEvent } from 'react'
import Navbar from "~/components/Navbar"
import FileUploader from "~/components/FileUploader"
import { useNavigate } from "react-router"
import { usePuterStore } from "~/lib/puter"
import { convertPdfToImage } from "~/lib/pdf2image"
import { generateUUID } from "~/lib/utils"
import { prepareInstructions } from "../../constants"

const Upload = () => {
    const { fs, ai, kv } = usePuterStore()
    const navigate = useNavigate()
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusText, setStatusText] = useState('')
    const [file, setFile] = useState<File | null>(null)

    const handleFileSelect = (file: File | null) => setFile(file)

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File }) => {
        setIsProcessing(true)
        setStatusText('Uploading resume...')

        const uploadedFile: any = await fs.upload([file])
        if (!uploadedFile) return setStatusText('Failed to upload file.')

        setStatusText('Converting to image...')
        const imageFile = await convertPdfToImage(file)
        if (!imageFile.file) return setStatusText(imageFile.error || 'Failed to convert PDF to image.')

        setStatusText('Uploading the image...')
        const uploadedImage: any = await fs.upload([imageFile.file])
        if (!uploadedImage) return setStatusText('Failed to upload image.')

        setStatusText('Preparing data...')
        const uuid = generateUUID()
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName,
            jobTitle,
            jobDescription,
            feedback: null,
        }
        console.log('Resume data:', data)
        await kv.set(`resume:${uuid}`, JSON.stringify(data))

        setStatusText('Analyzing...')
        try {
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            )
            console.log('Feedback response:', feedback)
            if (!feedback) return setStatusText('Failed to analyze resume - no response from AI.')

            console.log('Feedback message:', feedback.message)
            if (!feedback.message) return setStatusText('Failed to analyze resume - no message in response.')

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : Array.isArray(feedback.message.content) && feedback.message.content[0]?.text
                    ? feedback.message.content[0].text
                    : null

            if (!feedbackText) return setStatusText('Failed to extract feedback text from response.')

            console.log('Feedback text:', feedbackText)
            const parsedFeedback = JSON.parse(feedbackText)
            console.log('Parsed feedback:', parsedFeedback)

            data.feedback = parsedFeedback
            await kv.set(`resume:${uuid}`, JSON.stringify(data))
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error'
            console.error('Error during feedback analysis:', err)
            return setStatusText(`Failed to analyze resume: ${errorMsg}`)
        }

        setStatusText('Analysis complete, redirecting...')
        navigate(`/resume/${uuid}`)
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const companyName = formData.get('company-name') as string
        const jobTitle = formData.get('job-title') as string
        const jobDescription = formData.get('job-description') as string

        if (!file) return alert('Please select a resume PDF.')

        handleAnalyze({ companyName, jobTitle, jobDescription, file })
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart Feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}

                    {!isProcessing && (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" id="company-name" name="company-name" placeholder="Company Name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" id="job-title" name="job-title" placeholder="Job Title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea id="job-description" name="job-description" rows={5} placeholder="Job Description" />
                            </div>
                            <div className="form-div">
                                <label>Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>
                            <button type="submit" className="primary-button">Analyze Resume</button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}

export default Upload