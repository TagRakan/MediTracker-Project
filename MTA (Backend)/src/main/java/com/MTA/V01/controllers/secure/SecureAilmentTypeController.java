package com.MTA.V01.controllers.secure;

import com.MTA.V01.services.controllers.AilmentTypeServiceWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/protected/ailment/type")
public class SecureAilmentTypeController {
    @Autowired
    AilmentTypeServiceWrapper ailmentTypeServiceWrapper;

    @GetMapping("/search/{term}")
    public ResponseEntity<?> search(@PathVariable("term") String term){
        return ailmentTypeServiceWrapper.searchAilmentTypeByNameProtected(term);
    }

    @GetMapping("/findall")
    public ResponseEntity<?> findAllAilmentTypes(){
        return ailmentTypeServiceWrapper.findAllAilments();
    }

    @GetMapping("/findbyid/{id}")
    public ResponseEntity<?> findById(@PathVariable("id") Long ailmentTypeId){
        return ailmentTypeServiceWrapper.findAilmentTypeByIdProtected(ailmentTypeId);
    }
}
