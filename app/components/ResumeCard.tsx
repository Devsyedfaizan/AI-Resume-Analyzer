import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ScoreCircle from './ScoreCircle'
import { usePuterStore } from '~/lib/puter'

const ResumeCard = ({ resume:{id , companyName , jobTitle , feedback , imagePath} }: {
    resume: Resume
}) => {
  const { fs } = usePuterStore()
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loadingImage, setLoadingImage] = useState(true)

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoadingImage(true)
        // Read the image file from Puter and convert to blob URL
        const blob = await fs.read(imagePath)
        if (blob) {
          const url = URL.createObjectURL(blob)
          setImageUrl(url)
        }
      } catch (err) {
        console.error('Failed to load image:', err)
      } finally {
        setLoadingImage(false)
      }
    }

    if (imagePath) {
      loadImage()
    }
  }, [imagePath, fs])

  return (
    <div>
       <Link to={`/resume/${id}`} className='resume-card animate-in fade-in duration-1000'>
         <div className="resume-card-header">
         <div className="flex flex-col gap-2">
        <h2 className="text-black font-bold break-words">
            {companyName || "Untitled Resume"}

        </h2>
        <h3 className='text-lg bg-words text-gray-500'>{jobTitle}</h3>
       </div>
       <div className="flex-shrink-0">
          <ScoreCircle score={feedback.overallScore}/>
       </div>
         </div>
         <div className="gradient-border animate-in fade-in duration-1000">
            <div className="w-full h-full">
                {loadingImage ? (
                  <div className="w-full h-[350px] max-sm:h-[200px] bg-gray-200 animate-pulse flex items-center justify-center">
                    Loading...
                  </div>
                ) : (
                  <img src={imageUrl} alt={`${companyName} Resume`} className="w-full h-[350px] max-sm:h-[200px] object-cover object-top" />
                )}
            </div>
         </div>
      
       </Link>
    </div>
  )
}

export default ResumeCard
